import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { CourseGroupProvider } from '../models/course-group-provider'
import { CourseGroup, CourseMember } from '@platon/feature/course/common'
import { Observable } from 'rxjs'
import { ListResponse } from '@platon/core/common'

@Injectable()
export class RemoteCourseGroupProvider extends CourseGroupProvider {
  constructor(private readonly http: HttpClient) {
    super()
  }

  list(courseId: string): Observable<ListResponse<CourseGroup>> {
    return this.http.get<ListResponse<CourseGroup>>(`/api/v1/courseGroups/${courseId}`)
  }

  updateName(courseId: string, groupId: string, newName: string): Observable<CourseGroup> {
    return this.http.patch<CourseGroup>(`/api/v1/courseGroups/${courseId}/${groupId}`, { name: newName })
  }

  listMembers(courseId: string, groupId: string): Observable<ListResponse<CourseMember>> {
    return this.http.get<ListResponse<CourseMember>>(`/api/v1/courseGroupMembers/${courseId}/${groupId}`)
  }

  deleteMember(courseId: string, groupId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/courseGroupMembers/${courseId}/${groupId}/${userId}`)
  }

  addMember(courseId: string, groupId: string, userId: string): Observable<void> {
    return this.http.post<void>(`/api/v1/courseGroupMembers/${courseId}/${groupId}/${userId}`, {})
  }
}
