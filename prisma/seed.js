const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding default site settings...');

  // Default site settings
  const defaultSettings = [
    // Branding
    { key: 'site_name', value: 'Trầm Hương Tâm An' },
    { key: 'site_tagline', value: 'Tinh Hoa Trầm Hương Việt Nam' },

    // Contact
    { key: 'address', value: '123 Đường Trầm Hương, Quận 1, TP. Hồ Chí Minh' },
    { key: 'hotline', value: '0909 123 456' },
    { key: 'phone_cskh', value: '0909 789 012' },
    { key: 'email_main', value: 'info@tramhuongtaman.vn' },
    { key: 'email_support', value: 'support@tramhuongtaman.vn' },
    { key: 'hours_weekday', value: '8:00 - 20:00' },
    { key: 'hours_sunday', value: '9:00 - 17:00' },

    // Hero Section
    { key: 'hero_subtitle', value: 'Tinh Hoa Trầm Hương Việt' },
    { key: 'hero_title_line1', value: 'Khám Phá Vẻ Đẹp' },
    { key: 'hero_title_line2', value: 'Tinh Khôi Của' },
    { key: 'hero_title_highlight', value: 'Trầm Hương Tâm An' },
    { key: 'hero_description', value: 'Mang đến những sản phẩm trầm hương thiên nhiên chất lượng cao nhất, chế tác tỉ mỉ bởi các nghệ nhân lành nghề' },
    { key: 'hero_stat1_label', value: 'Năm kinh nghiệm' },
    { key: 'hero_stat1_value', value: '10+' },
    { key: 'hero_stat2_label', value: 'Khách hàng' },
    { key: 'hero_stat2_value', value: '5K+' },
    { key: 'hero_stat3_label', value: 'Thiên nhiên' },
    { key: 'hero_stat3_value', value: '100%' },

    // Blog Section
    { key: 'blog_title', value: 'Trầm Hương &\nCuộc Sống Tươi Mới' },
    { key: 'blog_paragraph1', value: 'Trầm hương từ xưa đã được coi là báu vật của thiên nhiên, mang theo nhiều lợi ích cho sức khỏe và tinh thần.' },
    { key: 'blog_paragraph2', value: 'Với hương thơm dịu nhẹ và lâu dài, trầm hương không chỉ tạo môi trường sống thoải mái mà còn giúp tĩnh tâm.' },
    { key: 'blog_feature1_title', value: 'Tinh thần sảng khoái' },
    { key: 'blog_feature1_desc', value: 'Trầm hương giúp tĩnh tâm, xua tan mệt mỏi và căng thẳng trong cuộc sống hàng ngày.' },
    { key: 'blog_feature2_title', value: 'Sức khỏe cải thiện' },
    { key: 'blog_feature2_desc', value: 'Hỗ trợ giấc ngủ sâu hơn, cải thiện chất lượng cuộc sống và sự tập trung.' },
    { key: 'blog_feature3_title', value: 'Trầm hương' },
    { key: 'blog_feature3_desc', value: 'Hương thơm tự nhiên, không hóa chất, an toàn cho sức khỏe gia đình.' },
    { key: 'blog_feature4_title', value: 'Phong vị riêng' },
    { key: 'blog_feature4_desc', value: 'Mỗi sản phẩm mang hương thơm độc đáo, phù hợp với sở thích cá nhân.' },

    // About Page
    { key: 'about_title', value: 'Tinh Hoa Trầm Hương Việt Nam' },
    { key: 'about_p1', value: 'Trầm Hương Tâm An được thành lập với mong muốn mang đến những sản phẩm trầm hương thiên nhiên chất lượng cao nhất cho người tiêu dùng Việt Nam.' },
    { key: 'about_p2', value: 'Với đội ngũ nghệ nhân giàu kinh nghiệm, chúng tôi cam kết mỗi sản phẩm đều được chế tác tỉ mỉ, từ khâu chọn nguyên liệu đến thành phẩm cuối cùng.' },
    { key: 'about_p3', value: 'Không chỉ là sản phẩm, mỗi tác phẩm trầm hương của chúng tôi còn mang theo giá trị văn hóa và tâm linh sâu sắc của người Việt.' },
    { key: 'process_title', value: 'Quy Trình Chế Tác' },
    { key: 'process_description', value: 'Từ việc lựa chọn nguyên liệu thô đến sản phẩm hoàn thiện, mỗi bước trong quy trình đều được thực hiện cẩn thận bởi các nghệ nhân có tay nghề cao.\n\nChúng tôi kết hợp giữa phương pháp truyền thống và công nghệ hiện đại, tạo nên những sản phẩm vừa giữ được nét đẹp truyền thống vừa phù hợp với phong cách sống hiện đại.' },

    // Testimonials (JSON)
    { 
      key: 'testimonials_data', 
      value: JSON.stringify([
        { name: 'Nguyễn Minh Anh', text: 'Mình rất hài lòng với sản phẩm vòng tay trầm hương. Hương thơm tự nhiên, kéo dài lâu.', rating: 5 },
        { name: 'Trần Văn Hùng', text: 'Bộ quà tặng trầm hương rất sang trọng. Thích hợp tặng cho người thân.', rating: 5 },
        { name: 'Lê Thu Hương', text: 'Trầm hương tự nhiên chất lượng tuyệt vời. Sẽ mua lại.', rating: 5 }
      ])
    },
  ];

  // Upsert mỗi setting (chỉ tạo nếu chưa tồn tại, không overwrite)
  for (const setting of defaultSettings) {
    const existing = await prisma.siteSetting.findUnique({
      where: { key: setting.key },
    });

    if (!existing) {
      await prisma.siteSetting.create({
        data: setting,
      });
      console.log(`✓ Created: ${setting.key}`);
    } else {
      console.log(`⊗ Skipped (exists): ${setting.key}`);
    }
  }

  console.log('✅ Seeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
