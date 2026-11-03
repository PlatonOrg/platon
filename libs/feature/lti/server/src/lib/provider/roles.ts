export enum AdminRoles {
  // System roles — core
  SystemAdministrator = 'http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator',

  // System roles — non-core
  AccountAdmin = 'http://purl.imsglobal.org/vocab/lis/v2/system/person#AccountAdmin',
  SysAdmin = 'http://purl.imsglobal.org/vocab/lis/v2/system/person#SysAdmin',
  SysSupport = 'http://purl.imsglobal.org/vocab/lis/v2/system/person#SysSupport',

  // Institution roles
  InstitutionAdministrator = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator',

  // Course administration roles — core
  ContextAdministrator = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator',

  SimpleAdministrator = 'Administrator',

  // Course administration sub-roles
  ContextAdminAdministrator = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Administrator#Administrator',
  Developer = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Administrator#Developer',
  ExternalDeveloper = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Administrator#ExternalDeveloper',
  ExternalSupport = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Administrator#ExternalSupport',
  ExternalSystemAdministrator = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Administrator#ExternalSystemAdministrator',
  Support = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Administrator#Support',
  ContextSystemAdministrator = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Administrator#SystemAdministrator',
}

export enum InstructorRoles {
  // Course role — core
  Instructor = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',

  SimpleInstructor = 'Instructor',

  // Institution role — non-core
  InstitutionInstructor = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor',

  // Institution role — core, teaching staff
  Faculty = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Faculty',

  // Instructional design — core
  ContentDeveloper = 'http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper',

  // Instructor sub-roles
  ExternalInstructor = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#ExternalInstructor',
  Grader = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#Grader',
  GuestInstructor = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#GuestInstructor',
  Lecturer = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#Lecturer',
  PrimaryInstructor = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#PrimaryInstructor',
  SecondaryInstructor = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#SecondaryInstructor',
  TeachingAssistant = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#TeachingAssistant',
  TeachingAssistantGroup = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#TeachingAssistantGroup',
  TeachingAssistantOffering = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#TeachingAssistantOffering',
  TeachingAssistantSection = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#TeachingAssistantSection',
  TeachingAssistantSectionAssociation = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#TeachingAssistantSectionAssociation',
  TeachingAssistantTemplate = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#TeachingAssistantTemplate',

  // ContentDeveloper sub-roles
  ContentExpert = 'http://purl.imsglobal.org/vocab/lis/v2/membership/ContentDeveloper#ContentExpert',
  ExternalContentExpert = 'http://purl.imsglobal.org/vocab/lis/v2/membership/ContentDeveloper#ExternalContentExpert',
  Librarian = 'http://purl.imsglobal.org/vocab/lis/v2/membership/ContentDeveloper#Librarian',
}

export enum StudentRoles {
  // Course role — core
  Learner = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',

  SimpleLearner = 'Learner',

  // Institution role — core
  InstitutionStudent = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student',

  // Institution role — non-core
  InstitutionLearner = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Learner',

  // Learner sub-roles
  ExternalLearner = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Learner#ExternalLearner',
  GuestLearner = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Learner#GuestLearner',
  LearnerInstructor = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Learner#Instructor',
  LearnerSubRole = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Learner#Learner',
  NonCreditLearner = 'http://purl.imsglobal.org/vocab/lis/v2/membership/Learner#NonCreditLearner',
}

export enum OtherLtiRoles { // Not used yet, but could be useful in the future
  // Course role — core
  Mentor = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Mentor',

  // Course role — non-core
  Manager = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Manager',
  Member = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Member',
  Officer = 'http://purl.imsglobal.org/vocab/lis/v2/membership#Officer',

  // Institution roles — core
  InstitutionStaff = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Staff',
  InstitutionGuest = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Guest',
  InstitutionOther = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Other',
  InstitutionNone = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#None',

  // Institution roles — non-core
  Alumni = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Alumni',
  InstitutionMember = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Member',
  InstitutionMentor = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Mentor',
  InstitutionObserver = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Observer',
  ProspectiveStudent = 'http://purl.imsglobal.org/vocab/lis/v2/institution/person#ProspectiveStudent',

  // System roles
  SystemNone = 'http://purl.imsglobal.org/vocab/lis/v2/system/person#None',
  SystemCreator = 'http://purl.imsglobal.org/vocab/lis/v2/system/person#Creator',
  SystemUser = 'http://purl.imsglobal.org/vocab/lis/v2/system/person#User',

  // LTI-specific role: test user
  TestUser = 'http://purl.imsglobal.org/vocab/lti/system/person#TestUser',
}

export declare type LTIRoles = AdminRoles | InstructorRoles | StudentRoles

/** LTI 1.3 roles that grant the teacher role in PLaTon. */
export const TEACHER_ROLES: readonly string[] = [...Object.values(AdminRoles), ...Object.values(InstructorRoles)]
