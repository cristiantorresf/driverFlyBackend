export interface WhatsAppMessageEntry {
  object: string
  entry: Entry[]
}

interface Entry {
  id: string
  changes: Change[]
}

interface Change {
  value: Value
  field: string
}

interface Value {
  messaging_product: string
  metadata: Metadata
  contacts?: Contact[]
  messages?: Message[]
  statuses?: Status[]
}

interface Metadata {
  display_phone_number: string
  phone_number_id: string
}

interface Contact {
  profile: {
    name: string;
  }
  wa_id: string
}

interface Status {
  id: string
  status: string | 'sent' | 'read' | 'delivered'
  timestamp: string
  recipient_id: string
  conversation?: Conversation
  pricing?: Pricing
}

interface Conversation {
  id: string
  origin: {
    type: string | 'marketing';
  }
  expiration_timestamp?: string
}

interface Pricing {
  billable: boolean
  pricing_model: string | 'CBP'
  category: string | 'marketing'
}

export interface Message {
  from: string
  id: string
  timestamp: string
  type: 'location' | 'text' | 'button'
  text?: {
    body: string
  }
  location?: {
    latitude: number;
    longitude: number;
  }
  button?: {
    payload: string;
    text: string;
  }
}

export type TemplateComponent = {
  type: string;
  parameters: Parameter[];
}

type Parameter = {
  type: string;
} & (ImageParameter | TextParameter)

interface ImageParameter {
  type: 'image'
  image: {
    link: string;
  }
}

interface TextParameter {
  type: 'text'
  text: string
}


