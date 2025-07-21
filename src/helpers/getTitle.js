import apiRequestRawHtml from "./apiRequestRawHtml";
import DomParser from "dom-parser";
import seriesFetcher from "./seriesFetcher";

export default async function getTitle(id) {
  const parser = new DomParser();
  
  try {
    const html = await apiRequestRawHtml(`https://www.imdb.com/title/${id}`);
    if (!html) throw new Error("No HTML content received");
    
    const dom = parser.parseFromString(html);
    const nextData = dom.getElementsByAttribute("id", "__NEXT_DATA__");
    if (!nextData.length) throw new Error("No __NEXT_DATA__ found");
    
    const json = JSON.parse(nextData[0].textContent);
    const props = json.props?.pageProps;
    if (!props) throw new Error("No pageProps found");

    // Helper function to safely get credits
    const getCredits = (lookFor, v) => {
      const credits = props.aboveTheFoldData?.principalCredits || [];
      const result = credits.find(e => e?.category?.id === lookFor);
      
      if (!result) return [];
      
      return result.credits?.map(e => {
        if (!e?.name?.nameText?.text) return v === "2" ? { id: null, name: null } : null;
        
        return v === "2"
          ? { id: e.name.id || null, name: e.name.nameText.text }
          : e.name.nameText.text;
      }) || [];
    };

    // Extract aboveTheFoldData once for performance
    const aftd = props.aboveTheFoldData || {};
    const mainCol = props.mainColumnData || {};
    
    // Safe date validation function
    const getValidatedDate = (rd) => {
      if (!rd) return null;
      
      const year = parseInt(rd.year);
      const month = parseInt(rd.month);
      const day = parseInt(rd.day);
      
      if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      
      try {
        const date = new Date(Date.UTC(year, month - 1, day));
        const isValid = date.getUTCFullYear() === year &&
                       date.getUTCMonth() === month - 1 &&
                       date.getUTCDate() === day;
        
        return isValid ? date.toISOString() : null;
      } catch {
        return null;
      }
    };

    // Build the result object
    const result = {
      id: id,
      review_api_path: `/reviews/${id}`,
      imdb: `https://www.imdb.com/title/${id}`,
      contentType: aftd.titleType?.id || null,
      contentRating: aftd.certificate?.rating || "N/A",
      isSeries: aftd.titleType?.isSeries || false,
      productionStatus: aftd.productionStatus?.currentProductionStage?.id || null,
      isReleased: aftd.productionStatus?.currentProductionStage?.id === "released",
      title: aftd.titleText?.text || null,
      year: aftd.titleText?.text || null,
      originaltitle: aftd.originalTitleText?.text || null,
      image: aftd.primaryImage?.url || null,
      images: (mainCol.titleMainImages?.edges || [])
        .filter(e => e?.__typename === "ImageEdge" && e?.node?.url)
        .map(e => e.node.url),
      plot: aftd.plot?.plotText?.plainText || "N/A",
      runtime: aftd.runtime?.displayableProperty?.value?.plainText || "",
      runtimeSeconds: aftd.runtime?.seconds || 0,
      rating: {
        count: aftd.ratingsSummary?.voteCount || 0,
        star: aftd.ratingsSummary?.aggregateRating || 0,
      },
      award: {
        wins: mainCol.wins?.total || 0,
        nominations: mainCol.nominations?.total || 0,
      },
      genre: (aftd.genres?.genres || []).map(e => e?.id).filter(Boolean),
      releaseDetailed: {
        date: getValidatedDate(aftd.releaseDate),
        day: aftd.releaseDate?.day || null,
        month: aftd.releaseDate?.month || null,
        year: aftd.releaseDate?.year || null,
        releaseLocation: {
          country: mainCol.releaseDate?.country?.text || null,
          cca2: mainCol.releaseDate?.country?.id || null,
        },
        originLocations: (mainCol.countriesOfOrigin?.countries || []).map(e => ({
          country: e?.text || null,
          cca2: e?.id || null,
        })),
      },
      year: aftd.releaseYear?.year || null,
      spokenLanguages: (mainCol.spokenLanguages?.spokenLanguages || []).map(e => ({
        language: e?.text || null,
        id: e?.id || null,
      })),
      filmingLocations: (mainCol.filmingLocations?.edges || [])
        .filter(e => e?.node?.text)
        .map(e => e.node.text),
      actors: getCredits("cast"),
      actors_v2: getCredits("cast", "2"),
      creators: getCredits("creator"),
      creators_v2: getCredits("creator", "2"),
      directors: getCredits("director"),
      directors_v2: getCredits("director", "2"),
      writers: getCredits("writer"),
      writers_v2: getCredits("writer", "2"),
      top_credits: (aftd.principalCredits || []).map(e => ({
        id: e?.category?.id || null,
        name: e?.category?.text || null,
        credits: (e.credits || [])
          .map(c => c?.name?.nameText?.text)
          .filter(Boolean),
      })),
    };

    // Add series data if applicable
    if (result.isSeries) {
      try {
        const seriesData = await seriesFetcher(id);
        return { ...result, ...seriesData };
      } catch (seriesError) {
        console.error(`Error fetching series data for ${id}:`, seriesError);
        return result;
      }
    }

    return result;
  } catch (error) {
    console.error(`Error processing title ${id}:`, error);
    return {
      id,
      error: true,
      message: error.message || "Unknown error occurred"
    };
  }
}
