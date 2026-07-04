const API_ORIGIN = "https://binge-api.ishanmadusanka.workers.dev";

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const targetUrl = `${API_ORIGIN}${url.pathname}${url.search}`;
  const proxyRequest = new Request(targetUrl, context.request);
  return fetch(proxyRequest);
};
