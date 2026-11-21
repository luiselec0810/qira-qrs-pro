export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  googleSub: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  hasGoogle: boolean;
  createdAt: string;
}

export function toUserDto(u: UserRecord): UserDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    hasPassword: Boolean(u.passwordHash),
    hasGoogle: Boolean(u.googleSub),
    createdAt: u.createdAt.toISOString(),
  };
}

export interface CreateUserData {
  id?: string;
  email: string;
  name: string;
  passwordHash?: string | null;
  googleSub?: string | null;
  avatarUrl?: string | null;
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findByGoogleSub(googleSub: string): Promise<UserRecord | null>;
  create(data: CreateUserData): Promise<UserRecord>;
  update(
    id: string,
    patch: Partial<Pick<UserRecord, "name" | "passwordHash" | "googleSub" | "avatarUrl">>,
  ): Promise<UserRecord | null>;
}
