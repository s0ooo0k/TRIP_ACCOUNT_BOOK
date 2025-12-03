export type Database = {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      participants: {
        Row: {
          id: string
          trip_id: string
          name: string
        }
        Insert: {
          id?: string
          trip_id: string
          name: string
        }
        Update: {
          id?: string
          trip_id?: string
          name?: string
        }
      }
      expenses: {
        Row: {
          id: string
          trip_id: string
          payer_id: string
          amount: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          payer_id: string
          amount: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          payer_id?: string
          amount?: number
          description?: string | null
          created_at?: string
        }
      }
      expense_participants: {
        Row: {
          expense_id: string
          participant_id: string
        }
        Insert: {
          expense_id: string
          participant_id: string
        }
        Update: {
          expense_id?: string
          participant_id?: string
        }
      }
    }
  }
}
