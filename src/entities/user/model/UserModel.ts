import type {RoleModel} from "@/entities/user";

export type UserModel = {
    id: string;
    username: string;
    email: string;
    role?: RoleModel;
    restricted?: boolean;
}