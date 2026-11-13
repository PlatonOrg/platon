import { readCustomParam } from './lti-user.utils'

describe('readCustomParam', () => {
  it('should return the value substituted by the LMS', () => {
    expect(readCustomParam({ groups: '12,13' }, 'groups')).toBe('12,13')
  })

  it('should ignore an unsubstituted Moodle variable', () => {
    expect(readCustomParam({ groups: '$Moodle.Person.userGroupIds' }, 'groups')).toBeUndefined()
    expect(readCustomParam({ username: '$User.username' }, 'username')).toBeUndefined()
  })

  it('should ignore a missing, empty or non-string value', () => {
    expect(readCustomParam(undefined, 'groups')).toBeUndefined()
    expect(readCustomParam({}, 'groups')).toBeUndefined()
    expect(readCustomParam({ groups: '  ' }, 'groups')).toBeUndefined()
    expect(readCustomParam({ groups: 12 }, 'groups')).toBeUndefined()
  })
})
