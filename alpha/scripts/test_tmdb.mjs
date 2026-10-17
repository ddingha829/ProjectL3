async function testTmdb() {
  console.log('--- 1. Testing Direct TMDB API Call ---');
  const apiKey = '90bfc0a0cd4fc36c572af68273547f42';
  const tmdbRes = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
      '인셉션'
    )}&language=ko-KR`
  );
  const tmdbData = await tmdbRes.json();
  console.log('TMDB Direct Status:', tmdbRes.status);
  console.log('Found Movies Count:', tmdbData.results?.length);
  if (tmdbData.results?.[0]) {
    const m = tmdbData.results[0];
    console.log(`Top Movie: ${m.title} (${m.release_date})`);
    console.log(`Rating: ${m.vote_average}`);
    console.log(`Poster Path: https://image.tmdb.org/t/p/w780${m.poster_path}`);
  }

  console.log('\n--- 2. Testing ProjectL3 Next.js /api/places/search Route ---');
  const appRes = await fetch(
    `http://localhost:3000/api/places/search?q=${encodeURIComponent(
      '인셉션'
    )}&category=CINEMA`
  );
  const appData = await appRes.json();
  console.log('App Search Status:', appRes.status);
  console.log('App Results Count:', appData.results?.length);
  appData.results.slice(0, 3).forEach((r, idx) => {
    console.log(`[Result ${idx + 1}]`);
    console.log(`  Name: ${r.name}`);
    console.log(`  Short: ${r.short}`);
    console.log(`  Category: ${r.category}`);
    console.log(`  Source: ${r.source}`);
    console.log(`  Poster: ${r.posterImg}`);
    console.log(`  Link: ${r.link}`);
  });
}

testTmdb().catch(console.error);
