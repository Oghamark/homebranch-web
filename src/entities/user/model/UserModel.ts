export type UserModel = {
    id: string;
    name: string;
    email: string;
    role?: string;
    provider: string;
}

export type UserSearchResult = Pick<UserModel, 'id' | 'name' | 'email'>;