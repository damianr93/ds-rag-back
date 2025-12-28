import { Request, Response } from 'express';
import { envs } from '../../config/envs';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email?: string;
    role?: string;
  };
}

interface OAuthState {
  userId: number;
  sourceId?: number;
  provider: 'google_drive' | 'dropbox' | 'onedrive';
  sourceName?: string;
  clientId: string;
  clientSecret: string;
  rootFolderId?: string;
}

export class OAuthController {
  /**
   * Genera URL de autorización OAuth y redirige al usuario
   */
  authorize = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { provider, clientId, clientSecret, sourceName, rootFolderId, sourceId } = req.body;

      if (!provider || !clientId || !clientSecret) {
        res.status(400).json({ 
          error: 'Missing required fields: provider, clientId, clientSecret' 
        });
        return;
      }

      // Crear state con toda la info necesaria (lo encriptamos para seguridad)
      const state: OAuthState = {
        userId,
        sourceId,
        provider,
        sourceName,
        clientId,
        clientSecret,
        rootFolderId,
      };

      const stateString = Buffer.from(JSON.stringify(state)).toString('base64');
      const redirectUri = `${envs.BACKEND_URL || 'http://localhost:3000'}/api/document-sources/oauth/callback`;

      let authUrl = '';

      switch (provider) {
        case 'google_drive':
          authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${encodeURIComponent(clientId)}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.readonly')}&` +
            `access_type=offline&` +
            `prompt=consent&` +
            `state=${encodeURIComponent(stateString)}`;
          break;

        case 'dropbox':
          authUrl = `https://www.dropbox.com/oauth2/authorize?` +
            `client_id=${encodeURIComponent(clientId)}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `token_access_type=offline&` +
            `state=${encodeURIComponent(stateString)}`;
          break;

        case 'onedrive':
          authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
            `client_id=${encodeURIComponent(clientId)}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent('Files.Read.All offline_access')}&` +
            `state=${encodeURIComponent(stateString)}`;
          break;

        default:
          res.status(400).json({ error: 'Invalid provider' });
          return;
      }

      res.json({ authUrl });
    } catch (error) {
      console.error('Error generating OAuth URL:', error);
      res.status(500).json({ 
        error: 'Failed to generate OAuth URL',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Callback OAuth - recibe el código y lo intercambia por tokens
   */
  callback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        res.redirect(`${envs.FRONTEND_URL || 'http://localhost:5173'}/document-explorer?error=${error}`);
        return;
      }

      if (!code || !state) {
        res.redirect(`${envs.FRONTEND_URL || 'http://localhost:5173'}/document-explorer?error=missing_params`);
        return;
      }

      // Decodificar state
      const stateData: OAuthState = JSON.parse(
        Buffer.from(state as string, 'base64').toString('utf-8')
      );

      const redirectUri = `${envs.BACKEND_URL || 'http://localhost:3000'}/api/document-sources/oauth/callback`;

      // Intercambiar código por tokens según el proveedor
      const tokens = await this.exchangeCodeForTokens(
        stateData.provider,
        code as string,
        stateData.clientId,
        stateData.clientSecret,
        redirectUri
      );

      // Redirigir al frontend con los tokens en la URL (serán procesados y guardados)
      const successUrl = `${envs.FRONTEND_URL || 'http://localhost:5173'}/document-explorer/oauth-success?` +
        `provider=${stateData.provider}&` +
        `accessToken=${encodeURIComponent(tokens.accessToken)}&` +
        `refreshToken=${encodeURIComponent(tokens.refreshToken || '')}&` +
        `sourceName=${encodeURIComponent(stateData.sourceName || '')}&` +
        `clientId=${encodeURIComponent(stateData.clientId)}&` +
        `clientSecret=${encodeURIComponent(stateData.clientSecret)}&` +
        `rootFolderId=${encodeURIComponent(stateData.rootFolderId || '')}&` +
        `sourceId=${stateData.sourceId || ''}`;

      res.redirect(successUrl);
    } catch (error) {
      console.error('Error in OAuth callback:', error);
      res.redirect(`${envs.FRONTEND_URL || 'http://localhost:5173'}/document-explorer?error=oauth_failed`);
    }
  };

  private async exchangeCodeForTokens(
    provider: string,
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const axios = require('axios');

    switch (provider) {
      case 'google_drive': {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        });

        return {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
        };
      }

      case 'dropbox': {
        const response = await axios.post('https://api.dropboxapi.com/oauth2/token', {
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        });

        return {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
        };
      }

      case 'onedrive': {
        const response = await axios.post(
          'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        return {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
        };
      }

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}

