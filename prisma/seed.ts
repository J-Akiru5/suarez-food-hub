import { PrismaClient, UserRole, VariantType, ProductAvailability } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Dumplings',
        slug: 'dumplings',
        description: 'Freshly made siomai in various styles',
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Spring Rolls',
        slug: 'spring-rolls',
        description: 'Crispy and delicious lumpia',
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Main Dish',
        slug: 'main-dish',
        description: 'Hearty Filipino main courses',
        sortOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Snacks',
        slug: 'snacks',
        description: 'Quick bites and merienda',
        sortOrder: 4,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Desserts',
        slug: 'desserts',
        description: 'Sweet treats to end your meal',
        sortOrder: 5,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Drinks',
        slug: 'drinks',
        description: 'Refreshing beverages',
        sortOrder: 6,
      },
    }),
  ]);

  const [dumplings, springRolls, mainDish, snacks, desserts, drinks] = categories;

  // Create products
  const products = await Promise.all([
    // Dumplings
    prisma.product.create({
      data: {
        name: 'Steamed Siomai',
        slug: 'steamed-siomai',
        description: 'Classic steamed pork and shrimp siomai',
        categoryId: dumplings.id,
        basePrice: 60.0,
        variantType: VariantType.preparation,
        stocks: 100,
        availability: ProductAvailability.available,
        isFeatured: true,
        variants: {
          create: [
            { name: 'Steamed', price: 60.0, stocks: 100, sortOrder: 1 },
            { name: 'Fried', price: 70.0, stocks: 100, sortOrder: 2 },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Shanghai Siomai',
        slug: 'shanghai-siomai',
        description: 'Premium shanghai-style siomai with egg',
        categoryId: dumplings.id,
        basePrice: 80.0,
        variantType: VariantType.preparation,
        stocks: 80,
        availability: ProductAvailability.available,
        variants: {
          create: [
            { name: 'Steamed', price: 80.0, stocks: 80, sortOrder: 1 },
            { name: 'Fried', price: 90.0, stocks: 80, sortOrder: 2 },
          ],
        },
      },
    }),

    // Spring Rolls
    prisma.product.create({
      data: {
        name: 'Pork Lumpia',
        slug: 'pork-lumpia',
        description: 'Crispy pork spring rolls with sweet chili sauce',
        categoryId: springRolls.id,
        basePrice: 50.0,
        variantType: VariantType.none,
        stocks: 120,
        availability: ProductAvailability.available,
        isFeatured: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Dynamite Lumpia',
        slug: 'dynamite-lumpia',
        description: 'Spicy green chili rolls with cheese filling',
        categoryId: springRolls.id,
        basePrice: 65.0,
        variantType: VariantType.none,
        stocks: 80,
        availability: ProductAvailability.available,
        isFeatured: true,
      },
    }),

    // Main Dish
    prisma.product.create({
      data: {
        name: 'Valenciana',
        slug: 'valenciana',
        description: 'Traditional Filipino rice dish with chicken and chorizo',
        categoryId: mainDish.id,
        basePrice: 80.0,
        variantType: VariantType.size,
        stocks: 50,
        availability: ProductAvailability.available,
        isFeatured: true,
        variants: {
          create: [
            { name: 'Medium', price: 80.0, stocks: 50, sortOrder: 1 },
            { name: 'Large', price: 150.0, stocks: 30, sortOrder: 2 },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Adobo',
        slug: 'adobo',
        description: 'Classic Filipino chicken adobo',
        categoryId: mainDish.id,
        basePrice: 75.0,
        variantType: VariantType.size,
        stocks: 50,
        availability: ProductAvailability.available,
        variants: {
          create: [
            { name: 'Medium', price: 75.0, stocks: 50, sortOrder: 1 },
            { name: 'Large', price: 140.0, stocks: 30, sortOrder: 2 },
          ],
        },
      },
    }),

    // Snacks
    prisma.product.create({
      data: {
        name: 'Fried Rice',
        slug: 'fried-rice',
        description: 'Garlic fried rice, perfect side dish',
        categoryId: snacks.id,
        basePrice: 35.0,
        variantType: VariantType.size,
        stocks: 100,
        availability: ProductAvailability.available,
        variants: {
          create: [
            { name: 'Medium', price: 35.0, stocks: 100, sortOrder: 1 },
            { name: 'Large', price: 60.0, stocks: 60, sortOrder: 2 },
          ],
        },
      },
    }),

    // Desserts
    prisma.product.create({
      data: {
        name: 'Bibingka',
        slug: 'bibingka',
        description: 'Soft rice cake with salted egg topping',
        categoryId: desserts.id,
        basePrice: 45.0,
        variantType: VariantType.none,
        stocks: 30,
        availability: ProductAvailability.available,
      },
    }),

    // Drinks
    prisma.product.create({
      data: {
        name: 'Fresh Juice',
        slug: 'fresh-juice',
        description: 'Freshly squeezed fruit juice',
        categoryId: drinks.id,
        basePrice: 25.0,
        variantType: VariantType.sugar_level,
        stocks: 200,
        availability: ProductAvailability.available,
        variants: {
          create: [
            { name: '100% Sugar', price: 25.0, stocks: 200, sortOrder: 1 },
            { name: '50% Sugar', price: 25.0, stocks: 200, sortOrder: 2 },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        name: 'Bottled Water',
        slug: 'bottled-water',
        description: '500ml purified drinking water',
        categoryId: drinks.id,
        basePrice: 15.0,
        variantType: VariantType.none,
        stocks: 300,
        availability: ProductAvailability.available,
      },
    }),
  ]);

  console.log(`Created ${categories.length} categories`);
  console.log(`Created ${products.length} products`);

  // Create a default admin user (Supabase Auth user must be created separately)
  // This is just for the Prisma side
  console.log('Seed completed!');
  console.log('\nNote: Create admin user via Supabase Auth dashboard or registration endpoint.');
  console.log('Set the user role to "admin" or "manager" in the profiles table.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
