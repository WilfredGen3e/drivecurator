import { Configuration, PopupRequest } from '@azure/msal-browser'

export const msalConfig: Configuration = {
  auth: {
    clientId: '42aaa073-c678-4a5c-afba-6b54c6a2dac0',
    authority: 'https://login.microsoftonline.com/consumers',
    redirectUri: window.location.origin,
  },
  cache: {
    // localStorage i.p.v. sessionStorage: in een geïnstalleerde PWA wordt
    // sessionStorage bij afsluiten gewist → anders elke start opnieuw inloggen.
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
}

export const loginRequest: PopupRequest = {
  scopes: ['User.Read', 'Files.ReadWrite', 'offline_access'],
}
