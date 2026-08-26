import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatCardModule } from '@angular/material/card'
import * as Papa from 'papaparse'
import { MatSelectModule } from '@angular/material/select'
import { FormsModule } from '@angular/forms'
import { MatInputModule } from '@angular/material/input'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { NzMessageModule, NzMessageService } from 'ng-zorro-antd/message'

export interface CsvHeaderOption {
  value: string
  label: string
}

export interface CsvImportData {
  [key: string]: string
}

export interface CsvImportError {
  message: string
}

@Component({
  selector: 'ui-csv-import',
  templateUrl: './csv-import.component.html',
  styleUrls: ['./csv-import.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatCardModule,
    MatSelectModule,
    FormsModule,
    MatInputModule,
    NzButtonModule,
    NzPopconfirmModule,
    NzIconModule,
    NzToolTipModule,
    NzSpinModule,
    NzMessageModule,
  ],
  providers: [NzMessageService],
})
export class CsvImportComponent implements OnDestroy {
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly messageService = inject(NzMessageService)

  @Input() headersOptions: CsvHeaderOption[] = []
  @Input() confirmButtonText = 'Valider et importer'
  @Input() dropzoneText = 'Glissez-déposez un fichier CSV ou cliquez pour en ajouter un'

  @Output() confirmed = new EventEmitter<CsvImportData[]>()
  @Output() canceled = new EventEmitter<void>()
  @Output() csvError = new EventEmitter<CsvImportError>()

  protected hasFile = false
  protected csv: string | null = null
  protected isDragOver = false

  protected tableData: string[][] = []
  protected tableHeaders: { [key: number]: string } = {}

  protected csvLoading = false
  protected confirmLoading = false
  protected scrollLoading = false

  protected hasHeader = false

  protected pageSize = 100
  protected currentPage = 1

  @ViewChild('tableContainer') tableContainerRef?: ElementRef<HTMLDivElement>

  get paginatedTableData(): string[][] {
    const start = 0
    const end = this.currentPage * this.pageSize
    return this.tableData.slice(start, end)
  }

  ngOnDestroy(): void {
    this.reset()
  }

  handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.readFile(input.files[0])
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault()
    this.isDragOver = true
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault()
    this.isDragOver = false
  }

  onDrop(event: DragEvent): void {
    event.preventDefault()
    this.isDragOver = false
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.readFile(event.dataTransfer.files[0])
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('csvFileInput') as HTMLInputElement
    fileInput?.click()
  }

  private readFile(file: File): void {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      const errorMsg = "Le fichier sélectionné n'est pas un fichier CSV."
      this.messageService.error(errorMsg)
      this.csvError.emit({ message: errorMsg })
      return
    }

    this.csvLoading = true
    this.changeDetectorRef.markForCheck()

    const reader = new FileReader()
    reader.onload = () => {
      this.csv = reader.result as string
      this.parseCsv(this.csv)

      this.csvLoading = false
      this.changeDetectorRef.markForCheck()
    }
    reader.readAsText(file)
  }

  private parseCsv(csv: string): void {
    Papa.parse(csv, {
      skipEmptyLines: 'greedy',
      complete: (result) => {
        this.hasFile = true
        this.tableData = result.data as string[][]
        if (this.tableData.length === 0) {
          this.messageService.error('Le fichier CSV est vide.')
          this.csvError.emit({ message: 'Le fichier CSV est vide.' })
          this.hasFile = false
          return
        }
        this.autoDetectHeaders()
        this.changeDetectorRef.markForCheck()
      },
    })
  }

  private autoDetectHeaders(): void {
    const detectedHeaders = new Set<string>()

    for (let i = 0; i < this.tableData[0].length; i++) {
      this.tableHeaders[i] = 'none'
      const header = this.tableData[0][i].toLowerCase()

      for (const option of this.headersOptions) {
        if (option.value === 'none') continue

        const keywords = this.getKeywordsForHeader(option.value)
        if (keywords.some((keyword) => header.includes(keyword)) && !detectedHeaders.has(option.value)) {
          this.tableHeaders[i] = option.value
          detectedHeaders.add(option.value)
          this.hasHeader = true
          break
        }
      }
    }

    // Détection des emails dans la deuxième ligne si pas d'en-tête détecté
    if (this.tableData.length > 1 && !this.hasHeader) {
      for (let i = 0; i < this.tableData[1].length; i++) {
        const cell = this.tableData[1][i].toLowerCase()
        if (cell.includes('@')) {
          const emailOption = this.headersOptions.find((opt) => this.getKeywordsForHeader(opt.value).includes('mail'))
          if (emailOption) {
            this.tableHeaders[i] = emailOption.value
          }
        }
      }
    }
  }

  private getKeywordsForHeader(value: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      firstName: ['prénom', 'prenom', 'firstname', 'first name'],
      lastName: ['nom', 'lastname', 'last name', 'surname'],
      email: ['courriel', 'mail', 'email', 'e-mail'],
      groupName: ['groupe', 'group', 'nom du groupe', 'group name'],
    }
    return keywordMap[value] || []
  }

  protected onColumnSelect(index: number, name: string): void {
    for (const key in this.tableHeaders) {
      if (this.tableHeaders[key] === name && name !== 'none') {
        this.tableHeaders[key] = 'none'
      }
    }
    this.tableHeaders[index] = name
  }

  deleteRow(rowIndex: number): void {
    this.tableData.splice(rowIndex, 1)
    if (rowIndex === 0 && this.hasHeader) {
      this.hasHeader = false
    }
    this.changeDetectorRef.markForCheck()
  }

  toggleHeader(): void {
    this.hasHeader = !this.hasHeader
    this.changeDetectorRef.markForCheck()
  }

  protected async confirmImport(): Promise<void> {
    this.confirmLoading = true
    this.changeDetectorRef.markForCheck()

    const requiredHeaders = this.headersOptions
      .filter((option) => option.value !== 'none')
      .map((option) => option.value)

    const missingHeaders = requiredHeaders.filter((header) => !Object.values(this.tableHeaders).includes(header))

    if (missingHeaders.length > 0) {
      const missingLabels = this.headersOptions
        .filter((option) => missingHeaders.includes(option.value))
        .map((option) => option.label)
        .join(', ')
      const errorMessage = `Les colonnes suivantes doivent être sélectionnées : ${missingLabels}`
      this.messageService.error(errorMessage)
      this.confirmLoading = false
      this.changeDetectorRef.markForCheck()
      return
    }

    const dataArray = this.extractData()
    this.confirmed.emit(dataArray)

    this.confirmLoading = false
    this.changeDetectorRef.markForCheck()
  }

  private extractData(): CsvImportData[] {
    const headerIndexMap: { [key: string]: number } = {}

    Object.keys(this.tableHeaders).forEach((key) => {
      const value = this.tableHeaders[Number(key)]
      if (value !== 'none') {
        headerIndexMap[value] = Number(key)
      }
    })

    const startIndex = this.hasHeader ? 1 : 0
    return this.tableData.slice(startIndex).map((row) => {
      const dataObj: CsvImportData = {}

      Object.entries(headerIndexMap).forEach(([header, index]) => {
        dataObj[header] = row[index]?.trim() || ''
      })

      return dataObj
    })
  }

  protected showMoreRows(): void {
    if (this.scrollLoading) return
    this.scrollLoading = true
    this.changeDetectorRef.markForCheck()

    setTimeout(() => {
      this.currentPage += 1
      this.scrollLoading = false
      this.changeDetectorRef.markForCheck()
    }, 300)
  }

  onTableScroll(): void {
    const container = this.tableContainerRef?.nativeElement
    if (!container) return

    const threshold = 100
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - threshold) {
      if (this.paginatedTableData.length < this.tableData.length) {
        this.showMoreRows()
      }
    }
  }

  reset(): void {
    this.hasFile = false
    this.csv = null
    this.tableData = []
    this.tableHeaders = {}
    this.hasHeader = false
    this.currentPage = 1
    this.changeDetectorRef.markForCheck()
  }

  cancel(): void {
    this.reset()
    this.canceled.emit()
  }
}
