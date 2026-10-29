import { sitePage } from "@/components/site/route-pages";
import { pageMetadata } from "@/lib/site-metadata";

export const generateMetadata = () => pageMetadata("about", "id");

export default sitePage("about", "id");
