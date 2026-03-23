import type { BackendPort } from '../application/ports/backendPort';
import { desktopApi } from '../lib/desktopApi';

export const backendPort: BackendPort = desktopApi;
