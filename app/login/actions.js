'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(prevState, formData) {
  // Handle FormData properly
  const email = formData.get('email')
  const password = formData.get('password')
  const redirectTo = formData.get('redirectTo') || '/swipe'
  
  // Validate inputs
  if (!email || !password) {
    return { 
      success: false, 
      error: 'E-Mail und Passwort sind erforderlich' 
    }
  }
  
  try {
    // Create client - with await
    console.log('Creating Supabase client...')
    const supabase = await createClient()
    
    console.log('Supabase client created, attempting login...')
    
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      console.error('Login error:', error)
      
      let errorMessage = 'Anmeldung fehlgeschlagen'
      
      if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Deine E-Mail-Adresse wurde noch nicht bestätigt. Bitte überprüfe deinen Posteingang.'
      } else if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Ungültige Anmeldedaten. Bitte überprüfe deine E-Mail-Adresse und dein Passwort.'
      } else {
        errorMessage = `Anmeldung fehlgeschlagen: ${error.message}`
      }
      
      return { success: false, error: errorMessage }
    }
    
    console.log('Login successful, redirecting...')
    
    // Refresh the cache and redirect
    revalidatePath('/', 'layout')
    redirect(redirectTo)
  } catch (error) {
    console.error('Unerwarteter Login-Fehler:', error)
    return { 
      success: false, 
      error: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.' 
    }
  }
}