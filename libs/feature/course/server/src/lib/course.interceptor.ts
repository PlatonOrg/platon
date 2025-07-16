import { Injectable, Logger } from '@nestjs/common'
import {
  LTILaunchInterceptor,
  LTILaunchInterceptorArgs,
  RegisterLtiLaunchInterceptor,
} from '@platon/feature/lti/server'
import { CourseMemberService } from './course-member/course-member.service'
import { CourseGroupService } from './course-group/course-group.service'
import { CourseGroupMemberService } from './course-group-member/course-group-member.service'
import { CourseMemberRoles } from '@platon/feature/course/common'
import { CourseService } from './services/course.service'
import { LmsCourseService } from './services/lms-course.service'

@Injectable()
@RegisterLtiLaunchInterceptor()
export class CourseLTIInterceptor implements LTILaunchInterceptor {
  protected readonly logger = new Logger(CourseLTIInterceptor.name)

  constructor(
    private readonly CourseService: CourseService,
    private readonly lmsCourseService: LmsCourseService,
    private readonly courseMemberService: CourseMemberService,
    private readonly courseGroupService: CourseGroupService,
    private readonly courseGroupMemberService: CourseGroupMemberService
  ) {}

  private getRoleFromPayload(payload: unknown): CourseMemberRoles {
    if (payload && typeof payload == 'object' && 'is_instructor' in payload && payload.is_instructor) {
      return CourseMemberRoles.teacher
    }
    return CourseMemberRoles.student
  }

  async intercept(args: LTILaunchInterceptorArgs): Promise<void> {
    const { payload, lms, lmsUser } = args
    const { user } = lmsUser
    const role = this.getRoleFromPayload(payload)

    this.logger.log(
      `[LTI COURSE INTERCEPTOR] Début du traitement pour l'utilisateur: ${user.username} (ID: ${user.id})`
    )
    this.logger.log(`[LTI COURSE INTERCEPTOR] Rôle déterminé: ${role}`)
    this.logger.log(`[LTI COURSE INTERCEPTOR] URL actuelle: ${args.nextUrl}`)

    const courseMatch = args.nextUrl.match(/\/courses\/(?<courseId>[^\\/]+)/)
    let courseId = courseMatch?.groups?.['courseId']
    
    this.logger.log(`[LTI COURSE INTERCEPTOR] CourseId extrait de l'URL: ${courseId || 'NON TROUVÉ'}`)
    this.logger.log(`[LTI COURSE INTERCEPTOR] Payload complet:`, payload)

    if (!courseId) {
      this.logger.log(`[LTI COURSE INTERCEPTOR] Recherche du cours LMS avec context_id: ${payload['context_id']}`)
      const lmsCourse = await this.lmsCourseService.findLmsCourseFromLTI(payload['context_id'], lms.id)

      const lmsCoursePresent = lmsCourse.isPresent()
      this.logger.log(`[LTI COURSE INTERCEPTOR] Cours LMS trouvé: ${lmsCoursePresent ? 'OUI' : 'NON'}`)

      if (!lmsCoursePresent && role === CourseMemberRoles.teacher) {
        this.logger.log(`[LTI COURSE INTERCEPTOR] Création d'un nouveau cours par l'enseignant`)
        this.logger.log(`[LTI COURSE INTERCEPTOR] Titre du cours: ${payload['context_title']}`)
        
        const course = await this.CourseService.create({
          name: payload['context_title'],
          desc: `Cours PLaTOn rattaché à : ${payload['context_title']}`,
          ownerId: user.id,
        })

        courseId = course.id
        this.logger.log(`[LTI COURSE INTERCEPTOR] Cours créé avec ID: ${courseId}`)

        await this.lmsCourseService.create({
          lmsId: lms.id,
          lmsCourseId: payload['context_id'],
          courseId,
        })
        
        this.logger.log(`[LTI COURSE INTERCEPTOR] Liaison LMS-Cours créée`)

        args.nextUrl = `/courses/${courseId}`
        this.logger.log(`[LTI COURSE INTERCEPTOR] URL mise à jour: ${args.nextUrl}`)
      } else if (!lmsCoursePresent && role !== CourseMemberRoles.teacher) {
        this.logger.log(
          `[LTI COURSE INTERCEPTOR] Cours non trouvé et utilisateur non enseignant - redirection vers not-found`
        )
        args.nextUrl = '/courses/not-found'
        return
      } else {
        courseId = lmsCourse.get().courseId
        this.logger.log(`[LTI COURSE INTERCEPTOR] Cours existant trouvé avec ID: ${courseId}`)
        args.nextUrl = `/courses/${courseId}`
        this.logger.log(`[LTI COURSE INTERCEPTOR] URL mise à jour: ${args.nextUrl}`)
      }
    }

    this.logger.log(`[LTI COURSE INTERCEPTOR] Vérification de l'adhésion au cours pour l'utilisateur: ${user.id}`)
    const courseMember = await this.courseMemberService.getByUserIdAndCourseId(user.id, courseId)

    courseMember.ifPresentOrElse(
      (member) => {
        this.logger.log(
          `[LTI COURSE INTERCEPTOR] Membre existant trouvé - Rôle actuel: ${member.role}, Rôle LTI: ${role}`
        )
        if (member.role !== role) {
          this.logger.log(`[LTI COURSE INTERCEPTOR] Mise à jour du rôle de ${member.role} vers ${role}`)
          return this.courseMemberService.updateRole(courseId, member.id, role)
        }
        return member
      },
      () => {
        this.logger.log(
          `[LTI COURSE INTERCEPTOR] Ajout de l'utilisateur ${user.username} au cours ${courseId} avec le rôle ${role}`
        )
        return this.courseMemberService.addUser(courseId, user.id, role)
      }
    )

    const customGroups = payload['custom_groups']
    this.logger.log(`[LTI COURSE INTERCEPTOR] Groupes personnalisés: ${customGroups || 'AUCUN'}`)
    
    if (courseId && customGroups && customGroups.length > 0) {
      const groups = customGroups.split(',')
      this.logger.log(`[LTI COURSE INTERCEPTOR] Traitement de ${groups.length} groupes: ${groups.join(', ')}`)
      
      for (const group of groups) {
        this.logger.log(`[LTI COURSE INTERCEPTOR] Ajout au groupe: ${group}`)
        await this.courseGroupService.addCourseGroup(courseId, group)
        await this.courseGroupMemberService.addCourseGroupMember(group, user.id)
      }
      
      this.logger.log(`[LTI COURSE INTERCEPTOR] Tous les groupes ont été traités`)
    }
    
    this.logger.log(`[LTI COURSE INTERCEPTOR] Traitement terminé pour l'utilisateur: ${user.username}`)
  }
}
