import { Body, Controller, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CreatedResponse, ItemResponse, UserRoles } from '@platon/core/common'
import { AuthTokenDTO, ResetPasswordInputDTO, SignInInputDTO, SignUpInputDTO } from './auth.dto'
import { AuthService } from './auth.service'
import { IRequest } from './auth.types'
import { Public } from './decorators/public.decorator'
import { Roles } from './decorators/roles.decorator'

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Roles(UserRoles.admin)
  @Post('signup')
  async signUp(@Body() input: SignUpInputDTO): Promise<CreatedResponse<AuthTokenDTO>> {
    return new CreatedResponse({
      resource: await this.authService.signUp(input),
    })
  }

  @Public()
  @Post('signin')
  async signIn(@Body() input: SignInInputDTO): Promise<ItemResponse<AuthTokenDTO>> {
    return new ItemResponse({
      resource: await this.authService.signIn(input),
    })
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() input: ResetPasswordInputDTO): Promise<ItemResponse<AuthTokenDTO>> {
    return new ItemResponse({
      resource: await this.authService.resetPassword(input),
    })
  }

  @ApiBearerAuth()
  @Post('refresh')
  async refresh(@Req() req: IRequest): Promise<ItemResponse<AuthTokenDTO>> {
    return new ItemResponse({
      resource: await this.authService.authenticate(req.user.id, req.user.username),
    })
  }
}
