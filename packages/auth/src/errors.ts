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

export class InvalidVerificationTokenError extends AuthError {
  constructor() {
    super("This verification link is invalid or has expired");
  }
}

export class VerificationCooldownError extends AuthError {
  constructor() {
    super("A verification email was already sent recently,  check your inbox or try again shortly");
  }
}