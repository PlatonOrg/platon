export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface AnthropicResponse {
  content: Array<{
    text: string
  }>
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export interface MistralResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}