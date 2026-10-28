declare module '*.module.css' {
  const styles: Record<string, string>
  export default styles
}

declare const __SUPABASE_URL__: string
declare const __SUPABASE_ANON_KEY__: string
