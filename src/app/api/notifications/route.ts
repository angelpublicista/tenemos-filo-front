import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { NotificationType } from '@/types';

function getAdminApp() {
  if (getApps().length > 0) return getApp();
  return initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseId, type, title, message, data } = body as {
      firebaseId: string;
      type: NotificationType;
      title: string;
      message: string;
      data?: Record<string, unknown>;
    };

    if (!firebaseId || !type || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    await db.collection('users').doc(firebaseId).collection('notifications').add({
      type,
      title,
      message,
      data: data ?? {},
      read: false,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
