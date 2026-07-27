// Copy these fields into the Angular environment file.
// Keep the service-role key and Google webhook secret OUT of Angular.

export const environment = {
  production: false,
  useMockData: false,

  // REQUIRED LATER
  supabaseUrl: '',
  supabaseAnonKey: '',

  // Normally derived from supabaseUrl:
  backendFunctionsBaseUrl: '',
};
