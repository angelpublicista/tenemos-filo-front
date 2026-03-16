import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!userId) {
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=missing_user`);
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=not_configured`);
  }

  const redirectUri = `${appUrl}/api/auth/microsoft/callback`;
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://graph.microsoft.com/Calendars.ReadWrite offline_access');
  authUrl.searchParams.set('response_mode', 'query');
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl.toString());
}
