export class AuthError extends Error {}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super("Invalid email or password");
  }
}

export class EmailAlreadyExistsError extends AuthError {
  constructor() {
    super("An account with this email already exists");
  }
}

export class UsernameAlreadyExistsError extends AuthError {
  constructor() {
    super("This username is already taken");
  }
}