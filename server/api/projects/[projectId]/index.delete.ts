import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const projectId = getRouterParam(event, "projectId");
    const project = await prisma.project.delete({
      where: {
        id: projectId,
      },
    })
    return new Response(JSON.stringify(project), { status: 200 });
  } catch (error) {
    return new Response("Internal Server Error", { status: 500 });
  }
})