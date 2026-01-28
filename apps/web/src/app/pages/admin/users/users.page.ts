import { CommonModule } from '@angular/common'
import { HttpErrorResponse } from '@angular/common/http'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core'
import { FormBuilder, FormGroup, FormsModule, Validators, ReactiveFormsModule } from '@angular/forms' // ADD
import {
  DialogModule,
  DialogService,
  UserSearchBarComponent,
  UserService,
  UserTableComponent,
  AuthService,
} from '@platon/core/browser'
import { SignUpInput, UpdateUser, User, UserFilters, UserRoles } from '@platon/core/common'
import { firstValueFrom } from 'rxjs'
import { NzButtonModule } from 'ng-zorro-antd/button'

@Component({
  standalone: true,
  selector: 'app-admin-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    UserTableComponent,
    UserSearchBarComponent,
    DialogModule,
    ReactiveFormsModule,
    NzButtonModule,
  ],
})
export class AdminUsersPage implements OnInit {
  private readonly userService = inject(UserService)
  private readonly dialogService = inject(DialogService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly authService = inject(AuthService)
  protected users: User[] = []
  protected filters: UserFilters = { limit: 10 }

  protected async update(user: User, change: UpdateUser): Promise<void> {
    try {
      const newUser = await firstValueFrom(this.userService.update(user, change))
      this.users = this.users.map((u) => (u.username === newUser.username ? newUser : u))
      this.dialogService.success(`${user.username} a été mis à jour !`)
    } catch {
      this.dialogService.error('Une erreur est survenue lors de cette action, veuillez réessayer un peu plus tard !')
    } finally {
      this.changeDetectorRef.markForCheck()
    }
  }

  userForm!: FormGroup
  showFields = false
  roles = ['Enseignant', 'Élève', 'Admin', 'Démo'] // use to display as options for the select

  constructor(private form: FormBuilder) {}

  ngOnInit(): void {
    this.userForm = this.form.group({
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      password: ['password', Validators.required],
    })
  }

  /** take the form answer for the role and convert into the UserRoles type
   * @remarks
   *  - candidate is not autorise here
   *  */
  getRole(role: string): UserRoles {
    switch (role) {
      case 'Enseignant':
        return UserRoles.teacher
      case 'Élève':
        return UserRoles.teacher
      case 'Démo':
        return UserRoles.demo
      case 'Admin':
        return UserRoles.admin
      default:
        throw new Error('Wrong role')
    }
  }

  /** show the form fields to add an user*/
  addUser() {
    this.showFields = !this.showFields
    if (this.showFields) {
      this.generatePassword()
      const user = this.userForm.value

      this.userService.update(user.username, user)
    }
  }

  /** generate a random password */
  generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    this.userForm.patchValue({ password: password })
  }

  /** add user  */
  async onSubmit() {
    if (this.userForm.valid) {
      const formResult = this.userForm.getRawValue()
      const newUser: SignUpInput = {
        role: this.getRole(formResult.role),
        username: formResult.username,
        firstName: formResult.firstname,
        lastName: formResult.lastname,
        email: formResult.email,
        password: formResult.password,
      }

      try {
        const userCreated = await this.authService.signUp(newUser)
        if (userCreated.success) {
          this.dialogService.success('Utilisateur créé : ' + newUser.username)
          this.userForm.reset()
        }
      } catch (error: unknown) {
        if (error instanceof HttpErrorResponse) {
          // admin can see this
          const httpError = error.error
          this.dialogService.error(httpError.message)
        } else if (error instanceof Error) {
          // admin must not see this (should not happend)
          this.dialogService.error('Error when adding a new user : see web console for more information')
          console.log('Error name : ' + error.name + '\nError message :' + error.message)
        }
      }
    }
  }
}
