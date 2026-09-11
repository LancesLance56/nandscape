/**
 * Length ceilings for discussion content.
 *
 * Their own module because both sides need them: the API clamps writes against
 * these, and the editor counts down against them. `lib/community/discussions`
 * opens the `pg` pool, so a client component importing a constant from there
 * drags the Postgres driver into the browser bundle - which fails the build on
 * `dns`, not on anything that names the real mistake.
 */

export const MAX_TITLE_LENGTH = 160;
export const MAX_BODY_LENGTH = 4000;
export const MAX_CODE_LENGTH = 8000;

/** A title short enough to be meaningless is rejected rather than trimmed. */
export const MIN_TITLE_LENGTH = 8;
