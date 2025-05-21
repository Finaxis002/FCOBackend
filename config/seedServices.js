// seedServices.js
const Service = require("../models/Service");

const seedDefaultServices = async () => {
  const defaultServices = [
    { name: "Detailed project report" },
    { name: "MSME Certificate" },
    { name: "GST registration" },
  ];

  for (const service of defaultServices) {
    const exists = await Service.findOne({ name: service.name });
    if (!exists) {
      await Service.create(service);
      console.log(`Inserted default service: ${service.name}`);
    }
  }
};

module.exports = seedDefaultServices;
