import { HomeBlog } from '@/widgets/home-blog/home-blog';
import { HomeContact } from '@/widgets/home-contact/home-contact';
import { HomeHero } from '@/widgets/home-hero/home-hero';
import { HomeProjects } from '@/widgets/home-projects/home-projects';
import { HomeTeam } from '@/widgets/home-team/home-team';

export const dynamic = 'force-static';

export default function Home() {
  return (
    <main>
      <HomeHero />
      <HomeProjects />
      <HomeBlog />
      <HomeTeam />
      <HomeContact />
    </main>
  );
}
