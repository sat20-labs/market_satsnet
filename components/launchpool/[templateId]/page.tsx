import TemplateDetailsClient from './TemplateDetailsClient';

export const generateStaticParams = async () => {
  // Replace this with actual logic to fetch template IDs
  const templateIds = ['Template001', 'Template002', 'Template003'];

  return templateIds.map((id) => ({
    templateId: id,
  }));
};

const TemplateDetailsPage = ({ params }: { params: { templateId: string } }) => {
  return <TemplateDetailsClient templateId={params.templateId} closeModal={() => { console.log('Modal closed'); }} />;
};

export default TemplateDetailsPage;
