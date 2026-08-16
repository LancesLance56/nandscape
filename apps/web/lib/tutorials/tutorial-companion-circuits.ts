/**
 * The tag that marks a project as a tutorial's companion circuit (see
 * seed/projects/*.json and app/api/projects/route.ts's seed-auth path,
 * which is how these get created). A plain tag rather than a new schema
 * column or boolean flag on Project, for two reasons: it reuses the tag
 * filter/display machinery the community page already needs for
 * user-submitted tags (see CommunityTagFilter), and it stays meaningful if
 * a circuit ever needs more than one classification (e.g. "tutorial" +
 * "adder") without a schema change for each new one.
 */
export const TUTORIAL_COMPANION_TAG = "tutorial";
