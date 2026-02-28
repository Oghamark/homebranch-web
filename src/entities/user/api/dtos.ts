export type UpdateUserRoleRequest = {
    role: 'ADMIN' | 'USER';
}

export type CreateUserRequest = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}
