export class SignUpDto {
    constructor(public name: string,
                public email: string,
                public password: string,
                public password_confirmation: string) {
    }
}