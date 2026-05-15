import { NextRequest, NextResponse } from 'next/server';
import {
  createIntegrationInSanity,
  getIntegrationsByUser,
  updateIntegrationInSanity,
} from '@/lib/sanity/integrationService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=zoho_auth_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=zoho_auth_failed`);
  }

  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
    userId = decoded.userId;
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=invalid_state`);
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=not_configured`);
  }

  try {
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${appUrl}/api/auth/zoho/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok || tokens.error) {
      return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=zoho_token_failed`);
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const existing = await getIntegrationsByUser(userId, { type: 'zoho' });

    if (existing.length > 0) {
      await updateIntegrationInSanity(existing[0]._id, {
        status: 'connected',
        lastSync: new Date().toISOString(),
        config: {
          ...existing[0].config,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existing[0].config?.refreshToken,
          expiresAt,
          autoSync: true,
          syncFrequency: '15min',
        },
      });
    } else {
      await createIntegrationInSanity({
        userId,
        type: 'zoho',
        name: 'Zoho Calendar',
        status: 'connected',
        config: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          autoSync: true,
          syncFrequency: '15min',
        },
      });
    }

    return NextResponse.redirect(`${appUrl}/dashboard/integrations?success=zoho_connected`);
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=zoho_token_failed`);
  }
}
