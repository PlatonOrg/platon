import { EditorJsData } from './tests.model'

export const defaultMailContent: EditorJsData = {
  blocks: [
    {
      id: '1zvXF-15EM',
      data: { text: 'Bonjour {{ firstName }} {{ lastName }},' },
      type: 'paragraph',
      tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
    },
    { id: '7j1WoXLwuf', data: {}, type: 'delimiter' },
    {
      id: 'sVD3bqlxXK',
      data: {
        text: 'Vous êtes invité à participer au test {{ testName }}. Veuillez cliquer sur le lien ci-dessous pour y accéder :',
      },
      type: 'paragraph',
      tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
    },
    { id: 'jxibMP3AqS', data: { html: '<a href="{{ testLink }}" target="_blank">{{ testLink }}</a> ' }, type: 'raw' },
    { id: 'DQyZOwRXWm', data: {}, type: 'delimiter' },
    { id: '1b9O1rOjil', data: {}, type: 'delimiter' },
    {
      id: 'QS1nVrsUna',
      data: {
        text: 'Le lien restera actif du {{ startDate }} à {{ startTime }} jusqu’au {{ endDate }} à {{ endTime }}. Veillez à compléter le test en une seule session.',
      },
      type: 'paragraph',
      tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
    },
    {
      id: 'ODo4YLrHYs',
      data: { text: 'N’hésitez pas à nous contacter si vous avez des questions.' },
      type: 'paragraph',
      tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
    },
    { id: 'HRvk_vNCSW', data: {}, type: 'delimiter' },
    {
      id: 'ppe1SOX90O',
      data: { text: 'Bien cordialement,' },
      type: 'paragraph',
      tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
    },
    { id: 'YDC127Vrv-', data: {}, type: 'delimiter' },
    {
      id: 'PqoRSFCHGo',
      data: { text: '{{ currentFirstName }} {{ currentLastName }}<br>{{ currentEmail }}' },
      type: 'paragraph',
      tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
    },
  ],
}
