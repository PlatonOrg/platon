export interface Topic {
  readonly id: string
  readonly createdAt: Date
  readonly updatedAt: Date
  name: string
}

export interface TopicDouble {
  topic: Topic
  doublons: boolean
}

export interface CreateTopic {
  readonly name: string
  readonly force?: boolean
}

export type UpdateTopic = Partial<CreateTopic>
