// Model
export type {UserModel} from './model/UserModel';
export type {RoleModel} from './model/RoleModel';

// API
export type {AssignRoleRequest, CreateUserRequest} from './api/dtos';
export {
    useGetUsersInfiniteQuery,
    useGetUserByIdQuery,
    useRestrictUserMutation,
    useUnrestrictUserMutation,
    useAssignRoleMutation
} from './api/api'
