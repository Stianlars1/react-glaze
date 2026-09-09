export const places = [
  {
    id: "funningur",
    name: "Funningur",
    category: "Village & fjord",
    image: "/images/funningur.jpg",
    alt: "A small village between green mountains and a blue Faroese fjord",
    position: "50% 58%",
    description:
      "A small village, a wide-open fjord. Make this the part of the day with no particular agenda.",
    note: "Leave space for a slow wander and a few photographs.",
    photographer: "Lachlan Gowen",
    source: "https://unsplash.com/photos/i16MLz7WmBQ",
  },
  {
    id: "gasadalur",
    name: "Gásadalur",
    category: "Waterfall & coast",
    image: "/images/gasadalur.jpg",
    alt: "A waterfall dropping from green cliffs into the Atlantic Ocean",
    position: "50% 55%",
    description:
      "The village above the waterfall. A little green, a little ocean, and a view worth putting the phone down for.",
    note: "Keep this stop flexible. The light is part of the experience.",
    photographer: "Marc Zimmer",
    source: "https://unsplash.com/photos/o7FDNTDJOZg",
  },
  {
    id: "lighthouse",
    name: "A lighthouse afternoon",
    category: "Along the coast",
    image: "/images/lighthouse.jpg",
    alt: "A white lighthouse and red houses on a grassy headland above the sea",
    position: "50% 66%",
    description:
      "Red houses, a white lighthouse, and the open Atlantic. A quiet coastal moment to add to your collection.",
    note: "An inspiration stop. Choose your exact route before you travel.",
    photographer: "Agnieszka Błaszczyk",
    source: "https://unsplash.com/photos/DzVgE9gfugM",
  },
] as const;

export type Place = (typeof places)[number];
export type PlaceId = Place["id"];
export function getPlace(id: PlaceId) {
  return places.find((place) => place.id === id)!;
}
