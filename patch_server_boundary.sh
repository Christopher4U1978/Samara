sed -i 's/  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {/  if (\n    process.env.NODE_ENV !== "production" \&\&\n    process.env.NODE_ENV !== "test" \&\&\n    !process.env.VITEST\n  ) {/' server.ts
sed -i 's/  } else if (process.env.NODE_ENV !== "test") {/  } else if (process.env.NODE_ENV !== "test" \&\& !process.env.VITEST) {/' server.ts
