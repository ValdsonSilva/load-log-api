export function requireSuperAdmin(req: any, res: any, next: any) {
    const user = req.user;

    if (!user) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }

    if (user.role !== "SUPER_ADMIN") {
        return res.status(403).json({
            message: "Forbidden: super admin access required",
        });
    }

    return next();
}