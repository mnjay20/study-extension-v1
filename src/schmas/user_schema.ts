export interface User {


    id: string;          // NanoID (public ID)

    username: string;

    email: string;

    passwordHash: string;

    // avatar?: string;

    // verified: boolean;

    createdAt: Date;

    updatedAt: Date;
}