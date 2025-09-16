import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatCardModule } from '@angular/material/card'
import * as Papa from 'papaparse'
import { CoursePresenter } from '../../../courses/course/course.presenter'
import { Subscription } from 'rxjs'
import { Router, RouterModule } from '@angular/router'
import { MatSelectModule } from '@angular/material/select'
import { FormsModule } from '@angular/forms'
import { MatInputModule } from '@angular/material/input'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { DialogModule, DialogService } from '@platon/core/browser'
import { TestPresenter } from '../test.presenter'

@Component({
  standalone: true,
  selector: 'app-test-csv-import',
  templateUrl: './csv-import.page.html',
  styleUrls: ['./csv-import.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatSelectModule,
    FormsModule,
    MatInputModule,
    NzButtonModule,
    NzPopconfirmModule,
    NzIconModule,
    NzToolTipModule,
    NzSpinModule,
    DialogModule,
  ],
})
export class CsvImportPage implements OnInit, OnDestroy {
  private readonly presenter = inject(CoursePresenter)
  private readonly testPresenter = inject(TestPresenter)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly subscriptions: Subscription[] = []
  private readonly router = inject(Router)
  private readonly dialogService = inject(DialogService)

  protected hasFile = false
  protected csv: string | null = null
  protected isDragOver = false

  protected tableData: string[][] = []

  protected tableHeaders: { [key: number]: string } = {}

  protected csvLoading = false
  protected confirmLoading = false
  protected scrollLoading = false

  protected headersOptions = [
    { value: 'none', label: '...' },
    { value: 'firstName', label: 'Prénom' },
    { value: 'lastName', label: 'Nom' },
    { value: 'email', label: 'Email' },
  ]

  protected hasHeader = false

  protected context = this.presenter.defaultContext()

  protected pageSize = 100
  protected currentPage = 1

  @ViewChild('tableContainer') tableContainerRef?: ElementRef<HTMLDivElement>

  get paginatedTableData(): string[][] {
    const start = 0
    const end = this.currentPage * this.pageSize
    return this.tableData.slice(start, end)
  }

  async ngOnInit(): Promise<void> {
    this.subscriptions.push(
      this.presenter.contextChange.subscribe(async (context) => {
        this.context = context
        this.changeDetectorRef.markForCheck()
      })
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
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
    fileInput.click()
  }

  private readFile(file: File): void {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      this.dialogService.error("Le fichier sélectionné n'est pas un fichier CSV.")
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
          this.dialogService.error('Le fichier CSV est vide.')
          this.hasFile = false
          return
        }
        let hasFirstName = false
        let hasLastName = false
        let hasEmail = false
        for (let i = 0; i < this.tableData[0].length; i++) {
          this.tableHeaders[i] = 'none'
          const header = this.tableData[0][i].toLowerCase()
          if ((header.includes('prénom') || header.includes('prenom')) && !hasFirstName) {
            this.tableHeaders[i] = 'firstName'
            hasFirstName = true
            this.hasHeader = true
          } else if (header.includes('nom') && !hasLastName) {
            hasLastName = true
            this.tableHeaders[i] = 'lastName'
            this.hasHeader = true
          } else if ((header.includes('courriel') || header.includes('mail')) && !hasEmail) {
            this.tableHeaders[i] = 'email'
            hasEmail = true
            this.hasHeader = true
          }
        }
        if (
          this.tableData.length > 1 &&
          (!this.hasHeader || Object.values(this.tableHeaders).every((value) => value !== 'email'))
        ) {
          for (let i = 0; i < this.tableData[1].length; i++) {
            const header = this.tableData[1][i].toLowerCase()
            if (header.includes('@')) {
              this.tableHeaders[i] = 'email'
            }
          }
        }
        this.changeDetectorRef.markForCheck()
      },
    })
  }

  protected onColumnSelect(index: number, name: string): void {
    for (const key in this.tableHeaders) {
      if (this.tableHeaders[key] === name) {
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

  toggleHeader() {
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
      this.dialogService.error(
        `Les colonnes suivantes doivent être sélectionnées : ${this.headersOptions
          .filter((option) => missingHeaders.includes(option.value))
          .map((option) => option.label)
          .join(', ')}`
      )
      this.confirmLoading = false
      this.changeDetectorRef.markForCheck()
      return
    }

    const firstNameIndex = Object.keys(this.tableHeaders).find((key) => this.tableHeaders[Number(key)] === 'firstName')
    const lastNameIndex = Object.keys(this.tableHeaders).find((key) => this.tableHeaders[Number(key)] === 'lastName')
    const emailIndex = Object.keys(this.tableHeaders).find((key) => this.tableHeaders[Number(key)] === 'email')

    const candidatesArray = this.tableData.map((row) => {
      const firstName = row[Number(firstNameIndex)]
      const lastName = row[Number(lastNameIndex)]
      const email = row[Number(emailIndex)]

      return {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      }
    })

    if (this.hasHeader) {
      candidatesArray.shift()
    }

    const addedMembers = await this.presenter.addTestMembers(candidatesArray)

    const testCandidates = addedMembers.map((member: any) => ({
      userId: member.userId,
      courseMemberId: member.id,
    }))

    await this.testPresenter.createManyTestsCandidates(testCandidates)

    this.router
      .navigate(['/tests', this.context.course?.id, 'candidates'], {
        replaceUrl: true,
        state: {
          addedMembers,
        },
      })
      .catch(console.error)
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
}
