// Updated publishToWordPress function
async function publishToWordPress(auth, topic) {
    // Other code...

    // Slug check
    let slug = buildSeoSlug(topic.product);

    if (await slugExistsInWordPress(auth, slug)) {
      console.log(`⚠️ Duplicate slug found for ${slug}, adding test suffix`);
      slug = `${slug}-test-${Date.now().toString().slice(-4)}`;
    }

    // Other code...
}