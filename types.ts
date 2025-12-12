export enum AppState {
  LOADING = 'LOADING',
  MODE_SELECT = 'MODE_SELECT',
  ROLE_SELECT = 'ROLE_SELECT',
  ID_ENTRY = 'ID_ENTRY',
  GROUP_SELECT = 'GROUP_SELECT',
  AVATAR_CREATOR = 'AVATAR_CREATOR',
  DASHBOARD = 'DASHBOARD',
  GAME = 'GAME',
}

export enum UserMode {
  STANDARD = 'STANDARD',
  BLIND = 'BLIND',
  DEAF = 'DEAF',
}

export enum UserRole {
  SCHOOL = 'SCHOOL',
  PLAYER = 'PLAYER', // Renamed from INDIVIDUAL to match DB
  GROUP = 'GROUP'
}

export enum GameType {
  MATHS = 'MATHS',
  AFRICAN_GK = 'AFRICAN_GK',
  UNIVERSE_GK = 'UNIVERSE_GK',
  LANG_READ = 'LANG_READ',
  LANG_WRITE = 'LANG_WRITE',
  LANG_SPEAK = 'LANG_SPEAK',
  LANG_LISTEN = 'LANG_LISTEN',
  LANG_SIGN = 'LANG_SIGN',
}

export interface Question {
  id: string;
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string;
  type: GameType;
  explanation?: string;
}

export interface UserStats {
  points: number;
  gamesPlayed: number;
  wins?: number;
  groupsNumber?: number; // Specific to School
}

export interface UserProfile {
  id?: string; // Unique ID (School Code or Player ID)
  name: string; // Display Name (Group Name or Player Name)
  photoURL?: string; // Renamed from avatarUrl to match DB
  mode: UserMode | string; // DB stores string lowercase usually
  role: UserRole | string;
  level: number; // Kept at root for game logic, though not in screenshot explicitly
  stats: UserStats;
  createdAt?: any; // Firestore Timestamp
  parentId?: string; // For Groups to know their School ID locally
}

export interface GameSession {
  ropePosition: number; // -100 to 100. 0 is center. Positive is User winning.
  currentQuestion?: Question;
  questions: Question[];
  score: number;
  streak: number;
}