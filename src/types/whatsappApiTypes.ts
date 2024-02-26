interface WhatsAppMessageEntry {
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
  status: string
  timestamp: string
  recipient_id: string
  conversation?: Conversation
  pricing?: Pricing
}

interface Conversation {
  id: string
  origin: {
    type: string;
  }
  expiration_timestamp?: string
}

interface Pricing {
  billable: boolean
  pricing_model: string
  category: string
}

interface Message {
  from: string
  id: string
  timestamp: string
  type: 'location' | 'text'
  text?: {
    body: string
  }
  location?: {
    latitude: number;
    longitude: number;
  }
}

interface TextMessage extends Message {
  text: {
    body: string;
  }
}

interface LocationMessage extends Message {
  location: {
    latitude: number;
    longitude: number;
  }
}
