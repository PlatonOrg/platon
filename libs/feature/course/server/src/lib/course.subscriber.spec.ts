import { InsertEvent } from 'typeorm'
import { CourseMemberRoles } from '@platon/feature/course/common'
import { CourseMemberEntity } from './course-member/course-member.entity'
import { CourseEntity } from './entites/course.entity'
import { CourseSubscriber } from './course.subscriber'

describe('CourseSubscriber', () => {
  it('devrait s\'enregistrer auprès du dataSource à la construction', () => {
    const dataSource = { subscribers: [] as unknown[] } as never
    const subscriber = new CourseSubscriber(dataSource)

    expect((dataSource as { subscribers: unknown[] }).subscribers).toContain(subscriber)
  })

  it('listenTo devrait retourner CourseEntity', () => {
    const subscriber = new CourseSubscriber({ subscribers: [] } as never)

    expect(subscriber.listenTo()).toBe(CourseEntity)
  })

  describe('afterInsert', () => {
    it("devrait ajouter le propriétaire comme membre enseignant du cours créé", async () => {
      const subscriber = new CourseSubscriber({ subscribers: [] } as never)
      const created = { userId: 'owner-1', courseId: 'course-1', role: CourseMemberRoles.teacher }
      const manager = {
        create: jest.fn().mockReturnValue(created),
        save: jest.fn().mockResolvedValue(created),
      }
      const event = {
        entity: { id: 'course-1', ownerId: 'owner-1' },
        manager,
      } as unknown as InsertEvent<CourseEntity>

      await subscriber.afterInsert(event)

      expect(manager.create).toHaveBeenCalledWith(CourseMemberEntity, {
        userId: 'owner-1',
        courseId: 'course-1',
        role: CourseMemberRoles.teacher,
      })
      expect(manager.save).toHaveBeenCalledWith(created)
    })
  })
})
