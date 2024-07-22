import { FaIndustry, FaUniversity, FaUser } from 'react-icons/fa';

const roles = [
    { icon: FaUser, title: 'Researchers', description: 'Submit proposals, collaborate, and receive funding' },
    { icon: FaUniversity, title: 'Research Centers', description: 'Support and manage research projects' },
    { icon: FaIndustry, title: 'Industry Partners', description: 'Fund research and access innovative solutions' },
];

export default function UserRoles() {
    return (
        <section className="section-padding bg-primary-950">
            <div className="container mx-auto">
                <h2 className="section-title">User Roles</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {roles.map((role, index) => (
                        <div key={index} className="card-base">
                            <role.icon className="text-6xl mb-6 text-primary-200" />
                            <h3 className="text-2xl font-semibold mb-4 text-white text-center">{role.title}</h3>
                            <p className="text-lg text-primary-100 text-center">{role.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}