import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ProductDetailsView } from "@/components/product-details-view";

export const Route = createFileRoute("/products/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Product — AIMarket` },
      { name: "description", content: `Details and pricing for product ${params.id}.` },
    ],
  }),
  component: ProductDetailsPage,
});

function ProductDetailsPage() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <ProductDetailsView productId={id} />
      <SiteFooter />
    </div>
  );
}
