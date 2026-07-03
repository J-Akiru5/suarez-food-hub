import { PrismaClient, ProductAvailability, VariantType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Dumplings",
        slug: "dumplings",
        description: "Freshly made siomai in various styles",
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        name: "Spring Rolls",
        slug: "spring-rolls",
        description: "Crispy and delicious lumpia",
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        name: "Main Dish",
        slug: "main-dish",
        description: "Hearty Filipino main courses",
        sortOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        name: "Dessert",
        slug: "dessert",
        description: "Sweet treats to end your meal",
        sortOrder: 4,
      },
    }),
    prisma.category.create({
      data: {
        name: "Drinks",
        slug: "drinks",
        description: "Refreshing beverages",
        sortOrder: 5,
      },
    }),
    prisma.category.create({
      data: {
        name: "Snacks",
        slug: "snacks",
        description: "Quick bites and merienda",
        sortOrder: 6,
      },
    }),
  ]);

  const [dumplings, springRolls, mainDish, dessert, drinks, _snacks] = categories;

  // Create products with variants
  const products = await Promise.all([
    // Dumplings
    prisma.product.create({
      data: {
        name: "Steamed Siomai",
        slug: "steamed-siomai",
        description: "Classic steamed pork and shrimp siomai, perfectly seasoned and tender.",
        categoryId: dumplings.id,
        basePrice: 60.0,
        imageUrl: "/assets/uploads/steamed-siomai.jpg",
        variantType: VariantType.preparation,
        quantity: 100,
        availability: ProductAvailability.available,
        isFeatured: true,
        rating: 5.0,
        variants: {
          create: [
            { name: "Steamed", price: 60.0, quantity: 100, sortOrder: 1 },
            { name: "Fried", price: 70.0, quantity: 100, sortOrder: 2 },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        name: "Fried Siomai",
        slug: "fried-siomai",
        description: "Crispy fried siomai with a golden crunch outside and juicy filling inside.",
        categoryId: dumplings.id,
        basePrice: 70.0,
        imageUrl: "/assets/uploads/fried-siomai.jpg",
        variantType: VariantType.none,
        quantity: 80,
        availability: ProductAvailability.available,
        rating: 4.8,
      },
    }),

    // Spring Rolls
    prisma.product.create({
      data: {
        name: "Pork Lumpia",
        slug: "pork-lumpia",
        description: "Crispy pork spring rolls with sweet chili sauce, a Filipino party favorite.",
        categoryId: springRolls.id,
        basePrice: 50.0,
        imageUrl: "/assets/uploads/pork-lumpia.jpg",
        variantType: VariantType.none,
        quantity: 120,
        availability: ProductAvailability.available,
        isFeatured: true,
        rating: 4.9,
      },
    }),
    prisma.product.create({
      data: {
        name: "Dynamite Lumpia",
        slug: "dynamite-lumpia",
        description: "Spicy green chili rolls filled with cheese and ground pork.",
        categoryId: springRolls.id,
        basePrice: 65.0,
        imageUrl: "/assets/uploads/dynamite-lumpia.jpg",
        variantType: VariantType.none,
        quantity: 80,
        availability: ProductAvailability.available,
        isFeatured: true,
        rating: 4.7,
      },
    }),

    // Main Dishes
    prisma.product.create({
      data: {
        name: "Valenciana",
        slug: "valenciana",
        description: "Traditional Filipino rice dish with chicken, chorizo, and spices.",
        categoryId: mainDish.id,
        basePrice: 80.0,
        imageUrl: "/assets/uploads/valenciana.jpg",
        variantType: VariantType.size,
        quantity: 50,
        availability: ProductAvailability.available,
        rating: 4.9,
        variants: {
          create: [
            { name: "Medium", price: 80.0, quantity: 50, sortOrder: 1 },
            { name: "Large", price: 150.0, quantity: 30, sortOrder: 2 },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        name: "Chicken Adobo",
        slug: "chicken-adobo",
        description: "Classic Filipino chicken adobo braised in soy sauce, vinegar, and garlic.",
        categoryId: mainDish.id,
        basePrice: 75.0,
        imageUrl: "/assets/uploads/chickenadobo.jpg",
        variantType: VariantType.size,
        quantity: 50,
        availability: ProductAvailability.available,
        rating: 4.8,
        variants: {
          create: [
            { name: "Medium", price: 75.0, quantity: 50, sortOrder: 1 },
            { name: "Large", price: 140.0, quantity: 30, sortOrder: 2 },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        name: "Beef Calderita",
        slug: "beef-calderita",
        description: "Rich beef stew with potatoes, carrots, and bell peppers in tomato sauce.",
        categoryId: mainDish.id,
        basePrice: 90.0,
        imageUrl: "/assets/uploads/beefcalderita.jpg",
        variantType: VariantType.size,
        quantity: 40,
        availability: ProductAvailability.available,
        rating: 4.7,
        variants: {
          create: [
            { name: "Medium", price: 90.0, quantity: 40, sortOrder: 1 },
            { name: "Large", price: 160.0, quantity: 25, sortOrder: 2 },
          ],
        },
      },
    }),

    // Desserts
    prisma.product.create({
      data: {
        name: "Leche Flan",
        slug: "leche-flan",
        description: "Creamy Filipino caramel custard, a classic dessert favorite.",
        categoryId: dessert.id,
        basePrice: 45.0,
        imageUrl: "/assets/uploads/lecheflan.jpg",
        variantType: VariantType.none,
        quantity: 30,
        availability: ProductAvailability.available,
        rating: 4.9,
      },
    }),
    prisma.product.create({
      data: {
        name: "Maja Blanca",
        slug: "maja-blanca",
        description: "Sweet coconut milk pudding with corn kernels, topped with latik.",
        categoryId: dessert.id,
        basePrice: 40.0,
        imageUrl: "/assets/uploads/maja-blanca.jpg",
        variantType: VariantType.none,
        quantity: 25,
        availability: ProductAvailability.available,
        rating: 4.6,
      },
    }),

    // Drinks
    prisma.product.create({
      data: {
        name: "Iced Coffee",
        slug: "iced-coffee",
        description: "Refreshing iced coffee, perfect for hot days.",
        categoryId: drinks.id,
        basePrice: 35.0,
        imageUrl: "/assets/uploads/iced-coffee.jpg",
        variantType: VariantType.sugar_level,
        quantity: 200,
        availability: ProductAvailability.available,
        rating: 4.5,
        variants: {
          create: [
            { name: "100% Sugar", price: 35.0, quantity: 200, sortOrder: 1 },
            { name: "50% Sugar", price: 35.0, quantity: 200, sortOrder: 2 },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        name: "Strawberry Shake",
        slug: "strawberry-shake",
        description: "Fresh strawberry shake made with real strawberries and milk.",
        categoryId: drinks.id,
        basePrice: 45.0,
        imageUrl: "/assets/uploads/strawberry-shake.jpg",
        variantType: VariantType.none,
        quantity: 100,
        availability: ProductAvailability.available,
        rating: 4.8,
      },
    }),
  ]);

  console.log(`Created ${categories.length} categories`);
  console.log(`Created ${products.length} products`);

  console.log("\nSeed completed!");
  console.log("Note: Create admin user via Supabase Auth dashboard or registration endpoint.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
