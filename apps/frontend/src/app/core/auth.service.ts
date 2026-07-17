import { Injectable } from '@angular/core';
import {
  signIn,
  confirmSignIn,
  signOut,
  fetchAuthSession,
} from 'aws-amplify/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  async login(email: string, password: string): Promise<'done' | 'new-password'> {
    const { nextStep } = await signIn({ username: email, password });
    if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      return 'new-password';
    }
    return 'done';
  }

  async completeNewPassword(newPassword: string): Promise<void> {
    await confirmSignIn({ challengeResponse: newPassword });
  }

  async logout(): Promise<void> {
    await signOut();
  }

  /** Returns the Cognito ID token (carries custom:id_usuario), or null. */
  async getIdToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  }
}
