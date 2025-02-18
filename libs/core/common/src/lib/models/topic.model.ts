export interface Topic {
  readonly id: string
  readonly createdAt: Date
  readonly updatedAt: Date
  name: string
  existing?: boolean
}

export interface TopicDouble {
  topic: Topic
  doublons: boolean
}

export interface CreateTopic {
  readonly name: string
  force?: boolean | null
}

export type UpdateTopic = Partial<CreateTopic>
